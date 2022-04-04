import { useContext, useEffect } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { Starmenu } from './components/Starmenu'
import { HomePage } from './pages/HomePage'
import { ClientsPage } from './pages/ClientsPage'
import { ClientPage } from './pages/ClientPage'
import { EventsPage } from './pages/EventsPage'
import { MessagesPage } from './pages/MessagesPage'
import { AuthPage } from './pages/AuthPage'
import { RegisterPage } from './pages/RegisterPage'
import { NavbarNonAuth } from './components/NavbarNonAuth'
import { Starheader } from './components/Starheader'
import { CreateCompanyPage } from './pages/CreateCompanyPage'
import { InvitePage } from './pages/InvitePage'
import { RedirectPage } from './pages/RedirectPage'
import { ClientOnlyPage } from './pages/ClientOnlyPage'

import { AccountPage } from './pages/AccountPage'


export const useRoutes = (isAuthenticated, userMembership) => {

  if (isAuthenticated) {
    const routes = []

    switch (userMembership) {
      case 'none':
        routes.push(
          <Routes key='1'>
            <Route path="/company" exact element={<CreateCompanyPage />} />
            <Route path="/account" exact element={<AccountPage />}/>
            <Route path="/*" exact element={<Navigate replace to="/company" />} />
          </Routes>
        )
        break
      case 'company':
        routes.push(
          <Routes key='1'>
            <Route path='/company' exact element={<HomePage />} />
            <Route path="/account" exact element={<AccountPage />}/>
            <Route path="/clients" exact element={<ClientsPage />} />
            <Route path="/client/:id" element={<ClientPage />} />
            <Route path="/events" exact element={<EventsPage />} />
            <Route path="/messages" exact element={<MessagesPage />} />
            <Route path="/*" element={<Navigate replace to='/company' />} />
          </Routes>
        )
        break
      case 'client':
        routes.push(
          <Routes key='1'>
            <Route path="/client" exact element={<ClientOnlyPage />} />
            <Route path="/account" exact element={<AccountPage />}/>
            <Route path="/messages" exact element={<MessagesPage />} />
            <Route path="/events" element={<Navigate replace to='/client?section=events' />} />
            <Route path="/*" element={<Navigate replace to='/client' />} />
          </Routes>
        )
        break
      case null:
        break
      default:
        routes.push(
          <Routes key='1'>
            <Route path="/company" exact element={<CreateCompanyPage />} />
            <Route path="/*" exact element={<Navigate replace to="/company" />} />
          </Routes>
        )
        break;
    }

    return (
      <Starheader>
        {
          routes
        }
      </Starheader>
    )
    
  } else {
    return (
      <div className='main__full'>
        <NavbarNonAuth />
        <Routes>
          <Route path="/auth" exact element={<AuthPage />} />
          <Route path="/register" exact element={<RegisterPage />} />
          <Route path="/i/:id" element={<RedirectPage />} />
          <Route path="/client" exact element={<InvitePage />} />
          <Route path="/*" element={<div>404</div>} />
          <Route path="/" exact element={<Navigate replace to="/auth" />} />
        </Routes>
      </div>
    )
  }
}