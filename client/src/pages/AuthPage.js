import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom'
import { useHttp } from '../hooks/http.hook';
import { AuthContext } from '../context/AuthContext';
import { TextField, Button, Snackbar, Alert } from '@mui/material';
import './AuthPage.css'


export const AuthPage = () => {
  const auth = useContext(AuthContext)

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
  )
}