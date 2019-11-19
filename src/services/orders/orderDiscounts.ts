import { ObjectID } from 'mongodb';
import { db } from '../../lib/mongo';
import OrdersService from './orders';
import { IDiscount } from './discount';

class OrdertDiscountsService {
	addDiscount(order_id: ObjectID, data: IDiscount) {
		if (!ObjectID.isValid(order_id)) {
			return Promise.reject('Invalid identifier');
		}
		const orderObjectID = new ObjectID(order_id);		

		return db.collection('orders').updateOne(
			{
				_id: orderObjectID
			},
			{
				$push: {
					discounts: data
				}
			}
		);
	}

	updateDiscount(order_id: ObjectID, discount_id: ObjectID, data: IDiscount) {
		if (!ObjectID.isValid(order_id) || !ObjectID.isValid(discount_id)) {
			return Promise.reject('Invalid identifier');
		}
		const orderObjectID = new ObjectID(order_id);
		const discountObjectID = new ObjectID(discount_id);		

		return db
			.collection('orders')
			.updateOne(
				{
					_id: orderObjectID,
					'discounts.id': discountObjectID
				},
				{ $set: data }
			)
			.then(res => OrdersService.getSingleOrder(order_id));
	}

	deleteDiscount(order_id: ObjectID, discount_id: ObjectID) {
		if (!ObjectID.isValid(order_id) || !ObjectID.isValid(discount_id)) {
			return Promise.reject('Invalid identifier');
		}
		const orderObjectID = new ObjectID(order_id);
		const discountObjectID = new ObjectID(discount_id);

		return db
			.collection('orders')
			.updateOne(
				{
					_id: orderObjectID
				},
				{
					$pull: {
						discounts: {
							id: discountObjectID
						}
					}
				}
			)
			.then(res => OrdersService.getSingleOrder(order_id));
	}
}

export default new OrdertDiscountsService();
