
import './AboutPage.css'

export const AboutPage = () => {

  return (
    <div className="about">
      <p className="about__description">Предустановленные пользователи для предпросмотра</p>
      <ul className="about__list">
        <li className="about__item about__title">Компании</li>
        <li className="about__item">wesley.gilbert@starboard.com | 123456</li>
        <li className="about__item about__title">Клиенты</li>
        <li className="about__item">perry.ramos@rudderse.com | 123456</li>
      </ul>
    </div>
  )

}