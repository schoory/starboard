
import { useState } from 'react'
import { useHttp } from './http.hook'

export const useClient = () => {
  
  const { request } = useHttp()

  const [variables, setVariables] = useState({
    id: null,
    name: null,
    email: null,
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
  })

  const getData = async (userToken, userId) => {
    request(
      "/api/client/getinfo",
      "POST",
      { userId: userId },
      {
        Authorization: `Bearer ${userToken}`,
      }
    ).then(data => {
      setVariables({
        id: data._id,
        name: data.clientName,
        email: data.email,
        address: data.registeredAddress,
        uen: data.UEN,
        uenDate: data.UENDate,
        uenStatus: data.UENStatus,
        status: data.clientStatus,
        regDate: data.dateOfReg,
        capital: data.capital,
        shareCapital: data.shareCapital,
        numOfShares: data.numOfShares,
        lastAGM: data.lastAGM,
        lastARFilled: data.lastARFilled,
        mainContact: data.mainContact,
        directors: data.directors,
        shareholders: data.shareholders,
        documents: data.documents,
        invites: data.invites,
        events: data.events,
        company: data.company
      })
    })
  }

  const getDocuments = (token) => {
    if (variables.id) {
      request(
        "/api/client/getdocuments",
        "POST",
        { clientId: variables.id, companyId: variables.company._id },
        {
          Authorization: `Bearer ${token}`,
        }
      ).then(data => {
        setVariables({ ...variables, documents: data.data })
      })
    }
  }

  const getEvents = (token, userId) => {
    request(
      "/api/client/getevents",
      "POST",
      { 
        clientId: variables.id,
        userId: userId
      },
      {
        Authorization: `Bearer ${token}`,
      }
    ).then(data => {
      setVariables({
        ...variables,
        events: data.events
      })
    })
  }

  const getInvites = (token) => {
    request(
      "/api/client/getinvites",
      "POST",
      { clientId: variables.id },
      {
        Authorization: `Bearer ${token}`,
      }
    ).then(data => {
      setVariables({
        ...variables,
        invites: data.invites
      })
    })
  }

  const clearData = () => {
    setVariables({
      id: null,
      name: null,
      email: null,
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
      company: null
    })
  }
  
  return { 
    variables,
    getData, clearData, getDocuments, getEvents, getInvites
  }
}