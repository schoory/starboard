import { createContext } from "react";

export const CompanyContext = createContext( {
  companyId: null,
  companyName: null,
  companyEmail: null,
  companyAddress: null,
  companyPhone: null,
  companyWeb: null,
  creationDate: null,
  usersCount: 0,
  adminsCount: 0,
  clientsCount: 0,
  users: null,
  admins: null,
  clients: null,
  owner: null,
  getCompanyInfo: null,
  getUsersList: null,
  getClientsList: () => {},
  clearCompanyInfo: null
})