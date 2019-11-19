import { ObjectID } from "mongodb";

export interface IAddress {
    _id: ObjectID;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    phone?:string;
    postal_code?: string;
    details?: string;
    default_shipping?: boolean;
    full_name?: string;
}