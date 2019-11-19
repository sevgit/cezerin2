import { ObjectID } from "mongodb";

export interface IDiscount {
	id: ObjectID;
	name: string;
	amount: number;
}