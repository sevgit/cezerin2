import { ObjectID } from "mongodb";

export interface IFilter {
    _id?: ObjectID;
    status_id?: ObjectID;
    customer_id?: ObjectID;
    payment_method_id?: ObjectID;
    shipping_method_id?: ObjectID;
    number?: number;
    closed?: boolean;
    cancelled?: boolean;
    delivered?: boolean;
    paid?: boolean;
    draft?: boolean;
    hold?: boolean;
    grand_total?: IMongoCondition;
    date_placed?: IMongoCondition;
    date_closed?: IMongoCondition;
    $or?: any[];
}

interface IMongoCondition{
    $or?: any;
    $gte?: any;
    $lte?: any;
}