import { ObjectID, InsertWriteOpResult, ObjectId } from 'mongodb';
import { db } from '../../lib/mongo';
import parse from '../../lib/parse';
import webhooks from '../../lib/webhooks';
import CustomerGroupsService from './customerGroups';
import AuthHeader from '../../lib/auth-header';
import security from '../../lib/security';
import { ICustomer } from './costumer';
import { IParams } from './params';
import { IFilter } from './filter';
import { IAddress } from './address';

class CustomersService {
	getFilter(params: IParams = {}): IFilter {
		// tag
		// gender
		// date_created_to
		// date_created_from
		// total_spent_to
		// total_spent_from
		// orders_count_to
		// orders_count_from

		const filter: IFilter = {};
		const id = parse.getObjectIDIfValid(params.id!);
		const group_id = parse.getObjectIDIfValid(params.group_id!);

		if (id) {
			filter._id = new ObjectID(id);
		}

		if (params.email) {
			filter.email = params.email.toLowerCase();
		}

		if (params.search) {
			filter.$or = [
				{ email: new RegExp(params.search, 'i') },
				{ mobile: new RegExp(params.search, 'i') },
				{ $text: { $search: params.search } }
			];
		}

		return filter;
	}

	getCustomers(params: IParams = {}) {
		const filter = this.getFilter(params);
		const limit = parse.getNumberIfPositive(params.limit!) || 1000;
		const offset = parse.getNumberIfPositive(params.offset!) || 0;

		return Promise.all([			
			db
				.collection('customers')
				.find(filter)
				.sort({ date_created: -1 })
				.skip(offset)
				.limit(limit)
				.toArray(),
			db.collection('customers').countDocuments(filter)
		]).then(([customers, customersCount]) => {
			const items = customers.map(customer =>
				this.changeProperties(customer)
			);
			const result = {
				total_count: customersCount,
				has_more: offset + items.length < customersCount,
				data: items
			};
			return result;
		});
	}

	getSingleCustomer(id: string) {
		if (!ObjectID.isValid(id)) {
			return Promise.reject('Invalid identifier');
		}		
		let params: IParams = { id: id }
		return this.getCustomers(params).then(items =>
			items.data.length > 0 ? items.data[0] : {}
		);
	}

	async addCustomer(customer: ICustomer) {
		//const customer: ICustomer = this.getValidDocumentForInsert(data);

		// is email unique
		if (customer.email && customer.email.length > 0) {
			const customerCount = await db
				.collection('customers')
				.count({ email: customer.email });
			if (customerCount > 0) {
				return Promise.reject('Customer email must be unique');
			}
		}

		const insertResponse = await db
			.collection('customers')
			.insertMany([customer]);			
		const newCustomerId = (insertResponse.ops[0] as ICustomer)._id!.toString();
		const newCustomer = await this.getSingleCustomer(newCustomerId);
		await webhooks.trigger({
			event: webhooks.events.CUSTOMER_CREATED,
			payload: newCustomer
		});
		return newCustomer;
	}

	async updateCustomer(id: string, customer: ICustomer) {
		if (!ObjectID.isValid(id)) {
			return Promise.reject('Invalid identifier');
		}
		const customerObjectID = new ObjectID(id);
		//const customer: ICustomer = this.getValidDocumentForUpdate(id, data);

		// is email unique
		if (customer.email && customer.email.length > 0) {
			const customerCount = await db.collection('customers').count({
				_id: {
					$ne: customerObjectID
				},
				email: customer.email
			});

			if (customerCount > 0) {
				return Promise.reject('Customer email must be unique');
			}
		}

		await db.collection('customers').updateOne(
			{
				_id: customerObjectID
			},
			{
				$set: customer
			}
		);

		const updatedCustomer = await this.getSingleCustomer(id);
		await webhooks.trigger({
			event: webhooks.events.CUSTOMER_UPDATED,
			payload: updatedCustomer
		});
		return updatedCustomer;
	}

	updateCustomerStatistics(customerId: ObjectID, totalSpent: number, ordersCount: number) {
		if (!ObjectID.isValid(customerId)) {
			return Promise.reject('Invalid identifier');
		}
		const customerObjectID = new ObjectID(customerId);
		const customerData = {
			total_spent: totalSpent,
			orders_count: ordersCount
		};

		return db
			.collection('customers')
			.updateOne({ _id: customerObjectID }, { $set: customerData });
	}

	async deleteCustomer(customerId: string) {
		if (!ObjectID.isValid(customerId)) {
			return Promise.reject('Invalid identifier');
		}
		const customerObjectID = new ObjectID(customerId);
		const customer = await this.getSingleCustomer(customerId);
		const deleteResponse = await db
			.collection('customers')
			.deleteOne({ _id: customerObjectID });
		await webhooks.trigger({
			event: webhooks.events.CUSTOMER_DELETED,
			payload: customer
		});
		return deleteResponse.deletedCount! > 0;
	}

	validateAddresses(addresses: IAddress[]) {
		if (addresses && addresses.length > 0) {
			const validAddresses = addresses.map(addressItem =>
				parse.getCustomerAddress(addressItem)
			);
			return validAddresses;
		}
		return [];
	}

	changeProperties(customer: ICustomer) {
		if (customer) {
			customer.id = customer._id!.toString();
			delete customer._id;

			if (customer.addresses && customer.addresses.length === 1) {
				customer.shipping = customer.addresses[0];
			} else if (customer.addresses && customer.addresses.length > 1) {

				const default_shipping = customer.addresses.find(
					address => address.default_shipping
				);
				
				customer.shipping = default_shipping || customer.addresses[0];
			}
			// } else {				
			// 	customer.shipping = {};
			// }
		}

		return customer;
	}

	addAddress(customer_id: ObjectID, address: IAddress) {
		if (!ObjectID.isValid(customer_id)) {
			return Promise.reject('Invalid identifier');
		}
		const customerObjectID = new ObjectID(customer_id);
		const validAddress = parse.getCustomerAddress(address);

		return db.collection('customers').updateOne(
			{
				_id: customerObjectID
			},
			{
				$push: {
					addresses: validAddress
				}
			}
		);
	}

	createObjectToUpdateAddressFields(address: IAddress) {
		const fields: any = {};

		if (address.address1 !== undefined) {
			fields['addresses.$.address1'] = parse.getString(address.address1);
		}

		if (address.address2 !== undefined) {
			fields['addresses.$.address2'] = parse.getString(address.address2);
		}

		if (address.city !== undefined) {
			fields['addresses.$.city'] = parse.getString(address.city);
		}

		if (address.state !== undefined) {
			fields['addresses.$.state'] = parse.getString(address.state);
		}

		if (address.phone !== undefined) {
			fields['addresses.$.phone'] = parse.getString(address.phone);
		}

		if (address.postal_code !== undefined) {
			fields['addresses.$.postal_code'] = parse.getString(address.postal_code);
		}		

		if (address.details !== undefined) {
			fields['addresses.$.details'] = address.details;
		}		

		if (address.default_shipping !== undefined) {
			fields['addresses.$.default_shipping'] = parse.getBooleanIfValid(
				address.default_shipping,
				false
			);
		}

		return fields;
	}

	updateAddress(customer_id: ObjectID, address_id: ObjectID, data: IAddress) {
		if (!ObjectID.isValid(customer_id) || !ObjectID.isValid(address_id)) {
			return Promise.reject('Invalid identifier');
		}
		const customerObjectID = new ObjectID(customer_id);
		const addressObjectID = new ObjectID(address_id);
		const addressFields = this.createObjectToUpdateAddressFields(data);

		return db.collection('customers').updateOne(
			{
				_id: customerObjectID,
				'addresses.id': addressObjectID
			},
			{ $set: addressFields }
		);
	}

	deleteAddress(customer_id: ObjectID, address_id: ObjectID) {
		if (!ObjectID.isValid(customer_id) || !ObjectID.isValid(address_id)) {
			return Promise.reject('Invalid identifier');
		}
		const customerObjectID = new ObjectID(customer_id);
		const addressObjectID = new ObjectID(address_id);

		return db.collection('customers').updateOne(
			{
				_id: customerObjectID
			},
			{
				$pull: {
					addresses: {
						id: addressObjectID
					}
				}
			}
		);
	}

	setDefaultBilling(customer_id: ObjectID, address_id: ObjectID) {
		if (!ObjectID.isValid(customer_id) || !ObjectID.isValid(address_id)) {
			return Promise.reject('Invalid identifier');
		}
		const customerObjectID = new ObjectID(customer_id);
		const addressObjectID = new ObjectID(address_id);

		return db
			.collection('customers')
			.updateOne(
				{
					_id: customerObjectID,
					'addresses.default_billing': true
				},
				{
					$set: {
						'addresses.$.default_billing': false
					}
				}
			)
			.then(res =>
				db.collection('customers').updateOne(
					{
						_id: customerObjectID,
						'addresses.id': addressObjectID
					},
					{
						$set: {
							'addresses.$.default_billing': true
						}
					}
				)
			);
	}

	setDefaultShipping(customer_id: ObjectID, address_id: ObjectID) {
		if (!ObjectID.isValid(customer_id) || !ObjectID.isValid(address_id)) {
			return Promise.reject('Invalid identifier');
		}
		const customerObjectID = new ObjectID(customer_id);
		const addressObjectID = new ObjectID(address_id);

		return db
			.collection('customers')
			.updateOne(
				{
					_id: customerObjectID,
					'addresses.default_shipping': true
				},
				{
					$set: {
						'addresses.$.default_shipping': false
					}
				}
			)
			.then(res =>
				db.collection('customers').updateOne(
					{
						_id: customerObjectID,
						'addresses.id': addressObjectID
					},
					{
						$set: {
							'addresses.$.default_shipping': true
						}
					}
				)
			);
	}

	logout() {
		// remove user from local storage to log user out
		localStorage.removeItem('user');
	}

	getAll() {
		const requestOptions = {
			method: 'GET'
			// headers: authHeader()
		};

		return fetch(`${security.storeBaseUrl}/users`, requestOptions).then(
			this.handleResponse
		);
	}

	handleResponse(response: Response) {
		return response.text().then(text => {
			const data = text && JSON.parse(text);
			if (!response.ok) {
				if (response.status === 401) {
					// auto logout if 401 response returned from api
					this.logout();
					location.reload(true);
				}

				const error = (data && data.message) || response.statusText;
				return Promise.reject(error);
			}

			return data;
		});
	}
}

export default new CustomersService();
