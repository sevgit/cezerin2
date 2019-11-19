import { IOrderItem } from "./orderItem";
import { ObjectID } from "mongodb";

export interface IOrder {
    customer_id?: ObjectID | null;
    status_id?: ObjectID | null;
    payment_method_id?: ObjectID | null;
    shipping_method_id?: ObjectID | null;
    date_updated?: Date;
    payment_token?: string;
    shipping_tax?: number;
    shipping_discount?: number;
    shipping_price?: number;
    tax_rate?: number;
    item_tax_included?: boolean;
    shipping_tax_included?: boolean;
    closed?: boolean;
    cancelled?: boolean;
    delivered?: boolean;
    paid?: boolean;
    hold?: boolean;
    draft?: boolean;
    first_name?: string;
    last_name?: string;
    password?: string;
    email?: string;
    mobile?: string;
    note?: string
    comments?: string;
    coupon?: string;
    tracking_number?: string;
    shipping_status?: string;
    tags?: string[];
    date_placed?: Date | null;
    date_paid?: Date | null;

    items?: [IOrderItem]
}