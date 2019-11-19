import { ObjectID } from "mongodb";
import { IAddress } from "./address";

export interface ICustomer {
    id?: string;
    _id?: ObjectID
	date_created?: Date;
	date_updated?: Date | null;
	note?: string;
	email?: string;
	mobile?: string;
	full_name?: string;
	first_name?: string;
	last_name?: string;
	password?: string;
	gender?: string;	
	social_accounts?: [];
	birthdate?: Date;
	addresses?: IAddress[];	
	total_spent?: number;
	orders_count?: number;
	shipping?: IAddress;
}