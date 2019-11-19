import { ObjectID } from "mongodb";

export interface IVariant {
    id: ObjectID;
    stock_quantity: number;
    options: [any];
    price?: number;
    sku: string;
    weight: number;
}