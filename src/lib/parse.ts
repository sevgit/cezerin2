import { ObjectID } from 'mongodb';
import { IAddress } from '../services/customers/address';

const getString = (value: string | number) => (value || '').toString();

const getDateIfValid = (value: string) => {
	const date = Date.parse(value);
	return isNaN(date) ? null : new Date(date);
};

const getArrayIfValid = (value: string) => (Array.isArray(value) ? value : null);

const getObjectIDIfValid = (value: string) =>
	ObjectID.isValid(value) ? new ObjectID(value) : null;

const getArrayOfObjectID = (value: string) => {
	if (Array.isArray(value) && value.length > 0) {
		return value.map(id => getObjectIDIfValid(id)).filter(id => !!id);
	}
	return [];
};

const isNumber = (value: string | number) => !isNaN(parseFloat(value as string)) && isFinite(value as number);

const getNumberIfValid = (value: string | number) => (isNumber(value) ? parseFloat(value as string) : null);

const getNumberIfPositive = (value: number) => {
	const n = getNumberIfValid(value);
	return n && n >= 0 ? n : null;
};

const getBooleanIfValid = (value: string | boolean | null, defaultValue: boolean) => {
	if (value === 'true' || value === 'false') {
		return value === 'true';
	}
	return typeof value === 'boolean' ? value : defaultValue;
};

const getBrowser = (browser: { ip: string, user_agent: string }) =>
	browser
		? {
			ip: getString(browser.ip),
			user_agent: getString(browser.user_agent)
		}
		: {
			ip: '',
			user_agent: ''
		};


const getCustomerAddress = (address: IAddress) => {
	return address;
};

const getOrderAddress = (address: IAddress) => {
	const emptyAddress: IAddress = {
		address1: '',
		address2: '',
		city: '',
		state: '',
		phone: '',
		postal_code: ''
	};

	return address ? address : emptyAddress;
};

export default {
	getString,
	getObjectIDIfValid,
	getDateIfValid,
	getArrayIfValid,
	getArrayOfObjectID,
	getNumberIfValid,
	getNumberIfPositive,
	getBooleanIfValid,
	getBrowser,
	getCustomerAddress,
	getOrderAddress
};
