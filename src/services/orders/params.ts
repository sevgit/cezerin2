export interface IParams {
    id?: string;
    status_id?: string;
    customer_id?: string;
    payment_method_id?: string;
    shipping_method_id?: string;
    closed?: boolean;
    cancelled?: boolean;
    delivered?: boolean;
    paid?: boolean;
    draft?: boolean;
    hold?: boolean;
    grand_total_min?: number;
    grand_total_max?: number;
    date_placed_min?: string | null;
    date_placed_max?: string | null;
    date_closed_min?: string | null;
    date_closed_max?: string | null;
    number?: number;
    limit?: number;
    offset?: number;
    search?: number | string;
}