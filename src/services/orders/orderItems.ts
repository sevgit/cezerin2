import { ObjectID } from 'mongodb';
import { db } from '../../lib/mongo';
import parse from '../../lib/parse';
import OrdersService from './orders';
import ProductsService from '../products/products';
import ProductStockService from '../products/stock';
import { IOrderItem } from './orderItem';
import { IVariant } from './variant';
import { IOrder } from './order';
import { IProduct } from '../products/product';
import { IOption } from '../products/option';

class OrderItemsService {
	async addItem(order_id: ObjectID, data: IOrderItem) {
		if (!ObjectID.isValid(order_id)) {
			return Promise.reject('Invalid identifier');
		}

		const newItem = this.getValidDocumentForInsert(data);
		const orderItem = await this.getOrderItemIfExists(
			order_id,
			newItem.product_id,
			newItem.variant_id
		);

		if (orderItem) {
			await this.updateItemQuantityIfAvailable(order_id, orderItem, newItem);
		} else {
			await this.addNewItem(order_id, newItem);
		}

		return OrdersService.getSingleOrder(order_id);
	}

	async updateItemQuantityIfAvailable(order_id: ObjectID, orderItem: IOrderItem, newItem: IOrderItem) {
		const quantityNeeded = orderItem.quantity + newItem.quantity;
		const availableQuantity = await this.getAvailableProductQuantity(
			newItem.product_id,
			newItem.variant_id,
			quantityNeeded
		);

		if (availableQuantity > 0) {
			await this.updateItem(order_id, orderItem.id, {
				quantity: availableQuantity
			});
		}
	}

	async addNewItem(order_id: ObjectID, newItem: IOrderItem) {
		const orderObjectID = new ObjectID(order_id);
		const availableQuantity = await this.getAvailableProductQuantity(
			newItem.product_id,
			newItem.variant_id,
			newItem.quantity
		);

		if (availableQuantity > 0) {
			newItem.quantity = availableQuantity;
			await db.collection('orders').updateOne(
				{
					_id: orderObjectID
				},
				{
					$push: {
						items: newItem
					}
				}
			);

			await this.calculateAndUpdateItem(order_id, newItem.id);
			await ProductStockService.handleAddOrderItem(order_id, newItem.id);
		}
	}

	async getAvailableProductQuantity(product_id: ObjectID, variant_id: ObjectID, quantityNeeded: number): Promise<number> {
		const product = await ProductsService.getSingleProduct(
			product_id.toString()
		);

		if (!product) {
			return 0;
		}
		if (product.discontinued) {
			return 0;
		}
		if (product.stock_backorder) {
			return quantityNeeded;
		}
		if (product.variable && variant_id) {
			//ERROR NOT SOLVED
			const variant: IVariant = this.getVariantFromProduct(product, variant_id);
			if (variant) {
				return variant.stock_quantity >= quantityNeeded
					? quantityNeeded
					: variant.stock_quantity;
			}
			return 0;
		}
		return product.stock_quantity >= quantityNeeded
			? quantityNeeded
			: product.stock_quantity;
	}

	async getOrderItemIfExists(order_id: ObjectID, product_id: ObjectID, variant_id: ObjectID) {
		const orderObjectID = new ObjectID(order_id);
		const order: IOrder = await db.collection('orders').findOne(
			{
				_id: orderObjectID
			},
			{
				//ERROR NOT SOLVED
				items: 1
			}
		);

		if (order && order.items && order.items.length > 0) {
			return order.items.find(
				item =>
					item.product_id.toString() === product_id.toString() &&
					(item.variant_id || '').toString() === (variant_id || '').toString()
			);
		}
		return null;
	}

	//ERROR NOT SOLVED - data: any?
	async updateItem(order_id: ObjectID, item_id: ObjectID, data: any) {
		if (!ObjectID.isValid(order_id) || !ObjectID.isValid(item_id)) {
			return Promise.reject('Invalid identifier');
		}
		const orderObjectID = new ObjectID(order_id);
		const itemObjectID = new ObjectID(item_id);

		if (parse.getNumberIfPositive(data.quantity) === 0) {
			// delete item
			return this.deleteItem(order_id, item_id);
		}
		// update
		await ProductStockService.handleDeleteOrderItem(order_id, item_id);
		await db.collection('orders').updateOne(
			{
				_id: orderObjectID,
				'items.id': itemObjectID
			},
			{
				$set: data
			}
		);

		await this.calculateAndUpdateItem(order_id, item_id);
		await ProductStockService.handleAddOrderItem(order_id, item_id);
		return OrdersService.getSingleOrder(order_id);
	}

	//ERROR NOT SOLVED - review return
	getVariantFromProduct(product: IProduct, variantId: ObjectID): IVariant | undefined | null {
		if (product.variants && product.variants.length > 0) {
			return product.variants.find(
				variant => variant.id.toString() === variantId.toString()
			);
		}

		return null;
	}

	getOptionFromProduct(product: IProduct, optionId: ObjectID) {
		if (product.options && product.options.length > 0) {
			return product.options.find(
				item => item.id.toString() === optionId.toString()
			);
		}

		return null;
	}

	getOptionValueFromProduct(product: IProduct, optionId: ObjectID, valueId: ObjectID) {
		const option: IOption = this.getOptionFromProduct(product, optionId);
		if (option && option.values && option.values.length > 0) {
			return option.values.find(
				item => item.id.toString() === valueId.toString()
			);
		}

		return null;
	}

	getOptionNameFromProduct(product: IProduct, optionId: ObjectID) {
		const option = this.getOptionFromProduct(product, optionId);
		return option ? option.name : null;
	}

	getOptionValueNameFromProduct(product: IProduct, optionId: ObjectID, valueId: ObjectID) {
		const value = this.getOptionValueFromProduct(product, optionId, valueId);
		return value ? value.name : null;
	}

	getVariantNameFromProduct(product: IProduct, variantId: ObjectID) {
		const variant = this.getVariantFromProduct(product, variantId);
		if (variant) {
			const optionNames = [];
			for (const option of variant.options) {
				const optionName = this.getOptionNameFromProduct(
					product,
					option.option_id
				);
				const optionValueName = this.getOptionValueNameFromProduct(
					product,
					option.option_id,
					option.value_id
				);
				optionNames.push(`${optionName}: ${optionValueName}`);
			}
			return optionNames.join(', ');
		}

		return null;
	}

	async calculateAndUpdateItem(orderId: ObjectID, itemId: ObjectID) {
		// TODO: tax_total, discount_total

		const orderObjectID = new ObjectID(orderId);
		const itemObjectID = new ObjectID(itemId);

		const order: IOrder = await OrdersService.getSingleOrder(orderId);

		if (order && order.items && order.items.length > 0) {
			const item = order.items.find(i => i.id.toString() === itemId.toString());
			if (item) {
				const itemData = await this.getCalculatedData(item);
				await db.collection('orders').updateOne(
					{
						_id: orderObjectID,
						'items.id': itemObjectID
					},
					{
						$set: itemData
					}
				);
			}
		}
	}

	async getCalculatedData(item: IOrderItem) {
		const product: IProduct = await ProductsService.getSingleProduct(
			item.product_id.toString()
		);

		if (item.custom_price && item.custom_price > 0) {
			// product with custom price - can set on client side
			return {
				'items.$.product_image': product.images,
				'items.$.sku': product.sku,
				'items.$.name': product.name,
				'items.$.variant_name': item.custom_note || '',
				'items.$.price': item.custom_price,
				'items.$.tax_class': product.tax_class,
				'items.$.tax_total': 0,
				'items.$.weight': product.weight || 0,
				'items.$.discount_total': 0,
				'items.$.price_total': item.custom_price * item.quantity
			};
		}
		if (item.variant_id) {
			// product with variant
			const variant = this.getVariantFromProduct(product, item.variant_id);
			const variantName = this.getVariantNameFromProduct(
				product,
				item.variant_id
			);
			const variantPrice =
				variant!.price && variant!.price > 0 ? variant!.price : product.price;

			if (variant) {
				return {
					'items.$.product_image': product.images,
					'items.$.sku': variant.sku,
					'items.$.name': product.name,
					'items.$.variant_name': variantName,
					'items.$.price': variantPrice,
					'items.$.tax_class': product.tax_class,
					'items.$.tax_total': 0,
					'items.$.weight': variant.weight || 0,
					'items.$.discount_total': 0,
					'items.$.price_total': variantPrice * item.quantity
				};
			}

			// variant not exists
			return null;
		}
		// normal product
		return {
			'items.$.product_image': product.images,
			'items.$.sku': product.sku,
			'items.$.name': product.name,
			'items.$.variant_name': '',
			'items.$.price': product.price,
			'items.$.tax_class': product.tax_class,
			'items.$.tax_total': 0,
			'items.$.weight': product.weight || 0,
			'items.$.discount_total': 0,
			'items.$.price_total': product.price * item.quantity
		};
	}

	async calculateAndUpdateAllItems(order_id: ObjectID) {
		const order = await OrdersService.getSingleOrder(order_id);

		if (order && order.items) {
			for (const item of order.items) {
				await this.calculateAndUpdateItem(order_id, item.id);
			}
			return OrdersService.getSingleOrder(order_id);
		}

		// order.items is empty
		return null;
	}

	async deleteItem(order_id: ObjectID, item_id: ObjectID) {
		if (!ObjectID.isValid(order_id) || !ObjectID.isValid(item_id)) {
			return Promise.reject('Invalid identifier');
		}
		const orderObjectID = new ObjectID(order_id);
		const itemObjectID = new ObjectID(item_id);

		await ProductStockService.handleDeleteOrderItem(order_id, item_id);
		await db.collection('orders').updateOne(
			{
				_id: orderObjectID
			},
			{
				$pull: {
					items: {
						id: itemObjectID
					}
				}
			}
		);

		return OrdersService.getSingleOrder(order_id);
	}

	getValidDocumentForInsert(data: IOrderItem) {
		data.id = new ObjectID();
		
		return data;
	}
}

export default new OrderItemsService();
