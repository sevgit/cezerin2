import { ObjectID } from "mongodb";

export interface IOrderItem {
    id: ObjectID;
    order_id: ObjectID;
    product_id: ObjectID;
    variant_id: ObjectID;
    quantity: number;
    custom_price: number;
    custom_note: number;
}