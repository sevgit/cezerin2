import { ObjectID } from 'mongodb';
import { db } from '../../lib/mongo';
import parse from '../../lib/parse';

export interface IGroup {
	name: string;
	description: string;
	date_created: Date | null;
	date_updated: Date | null;
}

class CustomerGroupsService {
	public getGroups(params = {}): Promise<IGroup[]> {
		return db
			.collection('customerGroups')
			.find()
			.toArray()
			.then(items => items.map(item => this.changeProperties(item)));
	}

	public getSingleGroup(id: string): Promise<IGroup> {
		if (!ObjectID.isValid(id)) {
			return Promise.reject('Invalid identifier');
		}
		const groupObjectID = new ObjectID(id);

		return db
			.collection('customerGroups')
			.findOne({ _id: groupObjectID })
			.then(item => this.changeProperties(item));
	}

	public addGroup(data: IGroup): Promise<IGroup> {
		const group = this.getValidDocumentForInsert(data);
		return db
			.collection('customerGroups')
			.insertMany([group])
			.then(res => this.getSingleGroup((res.ops[0]._id as number).toString()));
	}

	public updateGroup(id: string, data: IGroup): Promise<IGroup> {
		if (!ObjectID.isValid(id)) {
			return Promise.reject('Invalid identifier');
		}
		const groupObjectID = new ObjectID(id);
		const group = this.getValidDocumentForUpdate(id, data);

		return db
			.collection('customerGroups')
			.updateOne(
				{
					_id: groupObjectID
				},
				{ $set: group }
			)
			.then(res => this.getSingleGroup(id));
	}

	public deleteGroup(id: string): Promise<boolean> {
		if (!ObjectID.isValid(id)) {
			return Promise.reject('Invalid identifier');
		}
		const groupObjectID = new ObjectID(id);
		return db
			.collection('customerGroups')
			.deleteOne({ _id: groupObjectID })
			.then(deleteResponse => (deleteResponse.deletedCount as number) > 0);
	}

	public getValidDocumentForInsert(data: IGroup): IGroup {
		const group: IGroup = {
			date_created: new Date(),
			date_updated: null,
			name: parse.getString(data.name),
			description: parse.getString(data.description)
		};
		return group;
	}

	public getValidDocumentForUpdate(id: string, data: IGroup): IGroup | Error {
		if (Object.keys(data).length === 0) {
			return new Error('Required fields are missing');
		}

		const group: IGroup = {
			date_updated: new Date(),
			date_created: null,
			name: '',
			description: ''
		};

		if (data.name !== undefined) {
			group.name = parse.getString(data.name);
		}

		if (data.description !== undefined) {
			group.description = parse.getString(data.description);
		}

		return group;
	}

	public changeProperties(item: any) {
		if (item) {
			item.id = item._id.toString();
			delete item._id;
		}

		return item;
	}
}

export default new CustomerGroupsService();