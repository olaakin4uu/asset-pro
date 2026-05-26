import { api } from '../api';

export interface CustomerFleetInvoice {
  id: number;
  invoiceNumber: string;
  invoiceType: 'proforma' | 'direct';
  status: string;
  paymentStatus: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  balanceAmount: number;
  paidAmount: number;
  createdAt: string;
  bookingNumber: string;
  purpose: string;
  destination: string | null;
}

export interface CustomerFleetStats {
  totalBookings: number;
  pendingBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  outstandingAmount: number;
  totalBilled: number;
  invoiceCount: number;
}

// Customer-facing booking shape — matches the customer-safe field set the
// backend returns (no cost / condition / approver internals).
export interface CustomerBooking {
  id: number;
  companyId: number;
  vehicleId: number;
  bookingNumber: string;
  requestedBy: number;
  requestedByName: string | null;
  purpose: string;
  destination: string | null;
  startDateTime: string;
  endDateTime: string;
  actualStartDateTime: string | null;
  actualEndDateTime: string | null;
  numberOfPassengers: number;
  priority: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  rejectionReason: string | null;
  cancellationReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCreateBookingPayload {
  purpose: string;
  startLocation?: string;
  destination?: string;
  startDateTime: string;
  endDateTime: string;
  numberOfPassengers?: number;
  vehicleType?: string;
  cargo?: string;
  notes?: string;
}

export const customerBookingsApi = {
  list: async (): Promise<CustomerBooking[]> => {
    const response = await api.get('/fleet-portal/bookings');
    return response.data;
  },

  get: async (id: number): Promise<CustomerBooking> => {
    const response = await api.get(`/fleet-portal/bookings/${id}`);
    return response.data;
  },

  submit: async (data: CustomerCreateBookingPayload): Promise<CustomerBooking> => {
    const response = await api.post('/fleet-portal/bookings', data);
    return response.data;
  },

  cancel: async (id: number, reason?: string): Promise<CustomerBooking> => {
    const response = await api.patch(`/fleet-portal/bookings/${id}/cancel`, { reason });
    return response.data;
  },
};

export const customerPortalApi = {
  getInvoices: async (): Promise<CustomerFleetInvoice[]> => {
    const response = await api.get('/fleet-portal/bookings/invoices');
    return response.data;
  },

  getStats: async (): Promise<CustomerFleetStats> => {
    const response = await api.get('/fleet-portal/bookings/stats');
    return response.data;
  },
};
