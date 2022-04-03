
import { createContext } from "react";

export const ClientContext = createContext({
  variables: {
    id: null,
    name: null,
    address: null,
    uen: null,
    uenDate: null,
    uenStatus: null,
    status: null,
    regDate: null,
    capital: null,
    shareCapital: null,
    numOfShares: null,
    lastAGM: null,
    lastARFilled: null,
    mainContact: null,
    directors: null,
    shareholders: null,
    documents: null,
    invites: null,
    events: null,
    company: null
  },
  getData: () => {},
  getDocuments: () => {},
  getEvents: () => {},
  getInvites: () => {},
  clearData: () => {},
});