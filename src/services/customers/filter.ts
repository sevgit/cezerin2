import { ObjectID } from "mongodb";

export interface IFilter {
	_id?: ObjectID | null;
	email?: string | null;
	$or?: any;
}