import { IVariant } from "../orders/variant";

export interface IProduct {
    sku: string;
    name: string;
     variants: [IVariant]
     options: [any]
     images: [any];
     weight: number;
     tax_class: any;
     price: number;
}