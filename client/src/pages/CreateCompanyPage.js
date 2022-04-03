import { useState, useEffect, useContext } from "react"
import { TextField, Button, CircularProgress } from "@mui/material"
import { useHttp } from '../hooks/http.hook'
import { AuthContext } from "../context/AuthContext"
import './HomePage.css'

export const CreateCompanyPage = () => {
  const { loading, request, error, clearError } = useHttp()
  const auth = useContext(AuthContext)

  const [errorList, setErrorList] = useState({
    name: false, email: false, address: false, phone: false, web: false
  })
  const [companyInfo, setCompanyInfo] = useState({
    companyName: '', companyEmail: '', companyAddress: '', companyPhone: '', companyWeb: ''
  })
  const [creation, setCreation] = useState(false);

  const getCreationState = () => {
    return (
      <>
      <div className="company__info-title company__info-title_centered">
        <h3>Добавление компании</h3>
      </div>
      <div className="company__info-form">
        <TextField 
          id="companyName" 
          name="companyName"
          label="Название" 
          variant="standard" 
          placeholder='Введите название компании' 
          className="company__form-input"
          error={errorList.name}
          helperText={ errorList.name ? "Заполните это поле" : "Обязательное поле*"}
          onChange={handleChange}
          onBlur={handleNameBlur}
          fullWidth 
        />
        <TextField 
          id="companyEmail" 
          name="companyEmail"
          label="Email" 
          variant="standard" 
          placeholder='Введите email' 
          className="company__form-input"
          error={errorList.email}
          helperText={ errorList.email ? "Некорректный адрес электронной почты" : ""}
          onChange={handleChange}
          fullWidth 
        />
        <TextField 
          id="companyAddress" 
          name="companyAddress"
          label="Адрес" 
          variant="standard" 
          placeholder='Введите адрес компании' 
          className="company__form-input"
          error={errorList.address}
          helperText={ errorList.address ? "Ошибка" : ""}
          onChange={handleChange}
          fullWidth 
        />
        <TextField 
          id="companyWeb" 
          name="companyWeb"
          label="Веб-сайт" 
          variant="standard" 
          placeholder='Введите веб-сайт компании' 
          className="company__form-input"
          error={errorList.web}
          helperText={ errorList.web ? "Ошибка" : ""}
          onChange={handleChange}
          fullWidth 
        />
        <TextField 
          id="companyPhone" 
          name="companyPhone"
          label="Номер телефона" 
          variant="standard" 
          placeholder='Введите номер телефона компании' 
          className="company__form-input"
          error={errorList.phone}
          helperText={ errorList.phone ? "Ошибка" : ""}
          onChange={handleChange}
          fullWidth 
        />
        <div className="company__form-actions">
          <Button 
            variant='contained' 
            disabled={loading}
            className='company__form-btn'
            onClick={handleAddCompany}
            disableElevation
          >Добавить компанию</Button>
        </div>
      </div>
      </>
    )
  }

  useEffect(() => {
    // if (error) {
    //   setSnackbar({ text: error, severity: 'warning', visibility: true})
    // }
    clearError()
  }, [error, clearError])

  const handleCreationStateClick = event => {
    event.preventDefault()
    setCreation(true)
  }

  const handleNameBlur = event => {
    setErrorList({ ...setErrorList, name: !Boolean(event.target.value) })
  }
  
  const handleChange = event => {
    setCompanyInfo({ ...companyInfo, [event.target.name]: event.target.value })
  }

  const handleAddCompany = async (event) => {
    if (errorList.name || errorList.email || errorList.address || errorList.phone || errorList.web) {
      return 
    }
    const data = await request('/api/company/create', 'POST', { ...companyInfo }, {
      'Authorization': `Bearer ${auth.token}`
    })

    if (data) {
      auth.login(auth.token, auth.userId, data.company._id)
    }
  }

  // * Отображение загрузки
  const getLoadingScreen = () => {
    return (
      <div className="company__loading">
        <CircularProgress />
      </div>
    )
  }

  if (loading) {
    return getLoadingScreen()
  }

  return (
    <div className="company">
      <div className="company__info"> 
      {
        creation ? getCreationState() :
        <div className="company__info-title" >
          <h3>Ваша компания не обнаружена</h3> <br />
          <p>Вы можете <a href='#!' onClick={handleCreationStateClick} className='company__info-link'>добавить ее</a> или дождаться приглашения от руководителя к уже существующей компании</p>
        </div>
      }
      </div>
    </div>
  )
}