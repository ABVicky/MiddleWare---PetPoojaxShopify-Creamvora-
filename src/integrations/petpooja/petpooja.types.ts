export interface PetpoojaOrderItem {
  id: string;
  name: string;
  tax_inclusive?: boolean;
  gst_liability?: string;
  item_tax?: Array<{
    id?: string;
    name?: string;
    tax_percentage?: string;
    amount?: string;
  }>;
  item_discount?: string;
  price: string;
  final_price: string;
  quantity: string;
  description?: string;
  variation_name?: string;
  variation_id?: string;
  AddonItem?: {
    details: Array<{
      id: string;
      name: string;
      group_name?: string;
      price: string;
      group_id?: number | string;
      quantity: string;
    }>;
  };
}

export interface PetpoojaOrderDetails {
  orderID: string; // Partner's Order ID (e.g. Shopify Order Number)
  preorder_date?: string;
  preorder_time?: string;
  service_charge?: string;
  sc_tax_amount?: string;
  delivery_charges?: string;
  dc_tax_percentage?: string;
  dc_tax_amount?: string;
  dc_gst_details?: Array<{
    gst_liable: string;
    amount: string;
  }>;
  packing_charges?: string;
  pc_tax_amount?: string;
  pc_tax_percentage?: string;
  pc_gst_details?: Array<{
    gst_liable: string;
    amount: string;
  }>;
  order_type: string; // H (Home Delivery), P (PickUp), D (DineIn)
  ondc_bap?: string;
  advanced_order?: string;
  urgent_order?: boolean;
  urgent_time?: number;
  payment_type: string; // COD, Prepaid, ONLINE
  table_no?: string;
  no_of_persons?: string;
  discount_total?: string;
  tax_total?: string;
  discount_type?: string;
  total: string;
  description?: string;
  created_on: string; // YYYY-MM-DD HH:MM:SS
  enable_delivery?: number | string;
  min_prep_time?: number | string;
  callback_url: string;
  collect_cash?: string;
  otp?: string;
}

export interface PetpoojaCustomerDetails {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
}

export interface PetpoojaRestaurantDetails {
  res_name: string;
  address?: string;
  contact_information?: string;
  restID: string;
  name?: string;
}

export interface PetpoojaTaxItem {
  id?: string;
  title: string;
  type?: string;
  price?: string;
  tax?: string;
  amount?: string;
  percentage?: string;
  restaurant_liable_amt?: string;
}

export interface PetpoojaSaveOrderPayload {
  app_key: string;
  app_secret: string;
  access_token: string;
  orderinfo: {
    OrderInfo: {
      Restaurant: {
        details: PetpoojaRestaurantDetails;
      };
      Customer: {
        details: PetpoojaCustomerDetails;
      };
      Order: {
        details: PetpoojaOrderDetails;
      };
      OrderItem: {
        details: PetpoojaOrderItem[];
      };
      Tax: {
        details: PetpoojaTaxItem[];
      };
      Discount?: {
        details: Array<{
          id?: string;
          code?: string;
          title: string;
          type?: string;
          amount: string;
        }>;
      };
    };
    udid?: string;
    device_type?: string;
  };
  udid?: string;
  device_type?: string;
}

export interface PetpoojaSaveOrderResponse {
  success: "1" | "0" | string;
  message: string;
  restID?: string;
  clientOrderID?: string;
  orderID?: string; // Petpooja assigned POS order ID
}

export interface PetpoojaMenuResponse {
  success: "1" | "0" | string;
  message: string;
  restaurants?: Array<{
    restaurantid: string;
    active: string;
    menusharingcode: string;
    currency_html: string;
    minimumorderamount: string;
  }>;
  items?: Array<{
    itemid: string;
    itemname: string;
    itemcategoryid: string;
    price: string;
    in_stock: string;
    itemallowvariation: string;
    variation?: Array<{
      variationid: string;
      name: string;
      price: string;
      active: string;
    }>;
  }>;
  categories?: Array<{
    categoryid: string;
    categoryname: string;
  }>;
}

export interface PetpoojaCallbackPayload {
  restID: string;
  orderID: string;
  clientOrderID?: string;
  status: "Accept" | "Reject" | "Food Ready" | "Dispatched" | "Cancelled" | string;
  cancel_reason?: string;
  minimum_prep_time?: string;
}

export interface PetpoojaUpdateOrderStatusPayload {
  app_key: string;
  app_secret: string;
  access_token: string;
  restID: string;
  orderID?: string;
  clientorderID: string;
  cancelReason?: string;
  status: number; // -1 for Cancelled
}

export interface PetpoojaUpdateOrderStatusResponse {
  success: "1" | "0" | string;
  message: string;
  [key: string]: unknown;
}

export interface PetpoojaRiderStatusPayload {
  app_key: string;
  app_secret: string;
  access_token: string;
  restID: string;
  orderID?: string;
  clientorderID?: string;
  status?: number | string;
  rider_name?: string;
  rider_phone_number?: string;
}

export interface PetpoojaRiderStatusResponse {
  success: "1" | "0" | string;
  message: string;
  [key: string]: unknown;
}

