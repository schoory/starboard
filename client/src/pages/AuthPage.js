import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import { useHttp } from '../hooks/http.hook';
import { AuthContext } from '../context/AuthContext';
import { TextField, Button, Snackbar, Alert, SvgIcon } from '@mui/material';
import './AuthPage.css'


export const AuthPage = () => {
  const auth = useContext(AuthContext)

  const navigate = useNavigate()

  // ? данные формы
  const [form, setForm] = useState({
    email: '', password: ''
  });

  const [snack, setSnack] = useState({
    text: '', severity: 'warning', visibility: false
  })

  const { loading, request, error, clearError} = useHttp()

  // * вывод ошибок
  useEffect(() => {
    if (error) {
      setSnack({ text: error, severity: 'warning', visibility: true})
    }
    clearError()
  }, [error, clearError]);

  // * вход в систему
  const handleLogin = () => {
    if (!form.email) { 
      setSnack({ text: 'Заполните поле email', severity: 'warning', visibility: true })
    }
    if (!form.password) { 
      setSnack({ text: 'Введите пароль', severity: 'warning', visibility: true })
    }

    request('/api/auth/login', 'POST', {...form}).then(data => {
      auth.login(data.token, data.userId, data.refreshToken, data.userMembership)
    })
  }

  return (
    <>
      <div className="auth">
  
        <h2 className='auth__title'>Вход в Starboard</h2>
  
        <div className="auth__controls">
  
          <TextField 
            name='email'
            label='Email'
            placeholder='Введите email'
            variant='standard'
            className="dialog__input"
            onChange={ ({ currentTarget: { value, name } }) => {
              setForm({ ...form, [name]: value })
            }}
            fullWidth 
          />
          
          <TextField  
            name='password'
            type="password"
            label='Пароль'
            placeholder='Введите пароль'
            variant='standard'
            className="dialog__input"
            onKeyPress={({ key }) => {
              if (key === 'Enter') {
                handleLogin()
              }
            }}
            onChange={ ({ currentTarget: { value, name } }) => {
              setForm({ ...form, [name]: value })
            }}
            fullWidth 
          />
  
        </div>
        <div className="auth__actions">
  
          <div className="auth__register">
            <p>Нет аккаунта?</p>
            <Link 
              to={'/register'}
              className={loading ? 'auth__link auth__link_disabled' : 'auth__link'}
            >
              Создайте его!
            </Link>
          </div>
  
          <Button 
            variant='contained' 
            onClick={handleLogin} 
            disabled={loading}
            className='auth__btn'
            disableElevation
          >
            Войти
          </Button>
  
        </div>
  
        <Snackbar open={snack.visibility} autoHideDuration={3000} onClose={ () => { setSnack({ ...snack, visibility: false }) } }>
          <Alert severity={snack.severity} onClose={ () => { setSnack({ ...snack, visibility: false }) } }>
            {snack.text}
          </Alert>
        </Snackbar>
      </div>

      <div className="about-btn">
        <Button
          onClick={() => {
            navigate('/about')
          }}
        >
          <SvgIcon>
            <path fill="currentColor" d="M10,19H13V22H10V19M12,2C17.35,2.22 19.68,7.62 16.5,11.67C15.67,12.67 14.33,13.33 13.67,14.17C13,15 13,16 13,17H10C10,15.33 10,13.92 10.67,12.92C11.33,11.92 12.67,11.33 13.5,10.67C15.92,8.43 15.32,5.26 12,5A3,3 0 0,0 9,8H6A6,6 0 0,1 12,2Z" />
          </SvgIcon>
        </Button>
      </div>
    </>
  )
}