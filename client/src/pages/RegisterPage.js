import { useEffect, useState } from "react"
import { useHttp } from "../hooks/http.hook";
import { TextField, Button, Snackbar, Alert } from "@mui/material";
import DatePicker from '@mui/lab/DatePicker'
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import endOfQuarter from 'date-fns/endOfQuarter'
import sub from 'date-fns/sub'
import set from 'date-fns/set'
import ruLocale from 'date-fns/locale/ru';
import { Link, useNavigate } from "react-router-dom";


export const RegisterPage = () => {

  const navigate = useNavigate()

  // ? значения формы
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', birthDate: null, phoneNumber: ''
  })

  // ? максимальная и минимальная даты рождения
  const minDate = set(sub(endOfQuarter(new Date()), { years: 120 }), { hours: 0, minutes: 0, seconds: 0, milliseconds: 0})
  const maxDate = set(sub(endOfQuarter(new Date()), { years: 18 }), { hours: 0, minutes: 0, seconds: 0, milliseconds: 0})

  const [snack, setSnack] = useState({
    text: '', severity: 'warning', visibility: false
  })

  const { loading, request, error, clearError} = useHttp()

  // * вывод ошибок
  useEffect(() => {
    if (error) {
      setSnack({ text: error, severity: 'error', visibility: true})
    }
    clearError()
  }, [error, clearError])

  // * изменение даты рождения
  const handlerDateChange = event => {
    if (!event || isNaN(event.getTime())) { 
      setForm({ ...form, birthDate: null})
    } else {
      if (event > maxDate) {
        setForm({ ...form, birthDate: maxDate})
        return
      }
      if (event < minDate) {
        setForm({ ...form, birthDate: minDate})
        return
      }
      setForm({ ...form, birthDate: event})
    }
  }

  // * валидация полей формы
  const handleValidateInputs = () => {

    // проверка email на корректность
    const regexEmail = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
    if (!form.email) {
      return [true, 'Поле email является обязательным для заполнения']
    }
    if (!form.email.toLowerCase().match(regexEmail)) {
      return [true, 'Некорректное значение поля email']
    }

    // проверка пароля на корректность
    if (!form.password) {
      return [true, 'Поле Пароль является обязательным для заполнения']
    }
    if (form.password.length < 6) {
      return [true, 'Минимальная длина пароля 6 символов']
    }

    // проверка заполнения полей Имя и Фамилия
    if (!form.firstName) {
      return [true, 'Поле Имя является обязательным для заполнения']
    }
    if (!form.lastName) {
      return [true, 'Поле Фамилия является обязательным для заполнения']
    }

    // проверка даты рождения на корректность
    if (form.birthDate) {
      const date = new Date(form.birthDate)
      if (isNaN(date.getTime())) {
        return [true, 'Некорректное значение даты']
      }
      if (date.getTime() > maxDate.getTime()) {
        return [true, `Дата рождения больше допустимого значения (${maxDate.toLocaleDateString()})`]
      }
      if (date.getTime() < minDate.getTime()) {
        return [true, `Дата рождения меньше допустимого значения (${minDate.toLocaleDateString()})`]
      }
    }

    // проверка номера телефона на корректность
    const regexPhone = /^(\+)?((\d{2,3}) ?\d|\d)(([ -]?\d)|( ?(\d{2,3}) ?)){5,12}\d$/
    if (form.phoneNumber && !form.phoneNumber.match(regexPhone)) {
      return [true, 'Некорректное значение номера телефона']
    }

    return [false, '']
  }

  // * регистрация пользователя
  const handleRegister = () => {

    // проверка полей формы на корректность
    const [error, msg] = handleValidateInputs()
    if (error) {
      return setSnack({ visibility: true, severity: 'warning', text: msg })
    }

    request('/api/auth/register', 'POST', {...form}).then(data => {
      setSnack({ text: 'Пользователь успешно создан', severity: 'success', visibility: true})
      setTimeout(() => {
        navigate('/auth')
      }, 2000)
    })

  }
  
  return (
    <div>
      <div className="auth row">
        <h2 className='auth__title'>Регистрация в Starboard</h2>
        <div className="auth__controls">
  
          <p className="dialog__label">Email</p>
          <TextField 
            name="email"
            className="dialog__input"
            fullWidth 
            onChange={ ({ currentTarget: { name, value } }) => { 
              setForm({ ...form, [name]: value })
            }}
          />
          
          <p className="dialog__label">Пароль</p>
          <TextField 
            name="password"
            type="password"
            className="dialog__input"
            fullWidth 
            onChange={ ({ currentTarget: { name, value } }) => { 
              setForm({ ...form, [name]: value })
            }}
          />
  
          <div className="auth__row">
            <p className="dialog__label">Имя</p>
            <p className="dialog__label">Фамилия</p>
            <TextField 
              name="firstName"
              className="dialog__input"
              onChange={ ({ currentTarget: { name, value } }) => { 
                setForm({ ...form, [name]: value })
              }}
            />
            <TextField 
              name="lastName"
              className="dialog__input"
              onChange={ ({ currentTarget: { name, value } }) => { 
                setForm({ ...form, [name]: value })
              }}
            />
          </div>
  
          <LocalizationProvider dateAdapter={AdapterDateFns} locale={ruLocale}>
            <p className="dialog__label">Дата рождения</p>
            <DatePicker
              name="birthDate"
              mask={'__.__.____'}
              value={form.birthDate}
              onChange={handlerDateChange}
              renderInput={
                (params) => 
                  <TextField 
                    {...params} 
                    fullWidth 
                    className="dialog__input" 
                  />
              }
              clearable={true}
              minDate={minDate}
              maxDate={maxDate}
            />
          </LocalizationProvider>
          
          <p className="dialog__label">Номер телефона</p>
          <TextField 
            name="phoneNumber"
            className="dialog__input"
            fullWidth
            onChange={ ({ currentTarget: { name, value } }) => { 
              setForm({ ...form, [name]: value })
            }}
          />
  
        </div>
        <div className="auth__actions">
  
          <Link 
            to={'/auth'}
            className={loading ? 'auth__link auth__link_disabled' : 'auth__link'}
          >Войти в аккаунт</Link>
  
          <Button 
            variant='contained' 
            disabled={loading}
            className='auth__btn'
            onClick={handleRegister}
            disableElevation
          >Регистрация</Button>
  
        </div>
  
  
      </div>
      <Snackbar open={snack.visibility} autoHideDuration={3000} onClose={ () => { setSnack({ ...snack, visibility: false }) } }>
        <Alert severity={snack.severity} variant='filled' onClose={ () => { setSnack({ ...snack, visibility: false }) } }>
          {snack.text}
        </Alert>
      </Snackbar>
    </div>
  )
}