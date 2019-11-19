import { ObjectID } from 'mongodb';
import { db } from '../../lib/mongo';
import OrdersService from './orders';
import { IAddress } from '../customers/address';

class OrderAddressService {
	updateBillingAddress(id: ObjectID, data: IAddress) {
		if (!ObjectID.isValid(id)) {
			return Promise.reject('Invalid identifier');
		}
		const orderObjectID = new ObjectID(id);
		const billing_address = { id, data, target: 'billing_address' };

		return db
			.collection('orders')
			.updateOne(
				{
					_id: orderObjectID
				},
				{ $set: billing_address }
			)
			.then(res => OrdersService.getSingleOrder(id));
	}

	updateShippingAddress(id: ObjectID, data: IAddress) {
		if (!ObjectID.isValid(id)) {
			return Promise.reject('Invalid identifier');
		}
		const orderObjectID = new ObjectID(id);
		const shipping_address = {
			id,
			data,
			target: 'shipping_address'
		};

		return db
			.collection('orders')
			.updateOne(
				{
					_id: orderObjectID
				},
				{ $set: shipping_address }
			)
			.then(res => OrdersService.getSingleOrder(id));
	}
}

export default new OrderAddressService();
