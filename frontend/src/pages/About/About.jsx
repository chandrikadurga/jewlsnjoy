import { Link } from 'react-router-dom';
import craftImg from '../../assets/products/6/2.jpeg';
import './About.css';

const VALUES = [
  { title: 'Thoughtful Design', desc: 'Each piece begins with intention — designed to complement real moments, real outfits, and real lives.' },
  { title: 'Lasting Craftsmanship', desc: 'We use long-lasting PVD plating and durable materials so your pieces stay beautiful day after day.' },
  { title: 'Accessible Luxury', desc: 'Elegance shouldn\'t be reserved for rare occasions. Our pieces are priced to be worn and loved every day.' },
  { title: 'Confidence & Joy', desc: 'We believe the right piece of jewellery can quietly transform how you carry yourself through the world.' },
];

export default function About() {
  return (
    <div className="about-page">

      {/* Hero */}
      <section className="about-hero">
        <div className="container">
          <span className="eyebrow">Our Story</span>
          <h1 className="about-hero__title">
            Jewellery born from the joy<br className="about-hero__br" /> of everyday elegance
          </h1>
        </div>
      </section>

      {/* Mission */}
      <section className="section about-mission">
        <div className="container about-mission__inner">
          <div className="about-mission__content">
            <span className="eyebrow">Who We Are</span>
            <h2 className="about-mission__title">
              Elegance designed for every day
            </h2>
            <div className="divider divider-left" aria-hidden="true" />
            <p className="about-mission__text">
              At Jewels &apos;n&apos; Joys, we believe that beautiful jewellery isn&apos;t only
              for grand celebrations. The right piece can make an ordinary Tuesday
              feel special. It can be the quiet confidence you carry with you, the
              small detail that makes you feel entirely yourself.
            </p>
            <p className="about-mission__text">
              Each piece in our collection is thoughtfully designed — balancing
              elegance with wearability, sophistication with simplicity. We choose
              materials that last, finishes that hold, and forms that feel timeless
              rather than trendy.
            </p>
            <p className="about-mission__text">
              This is jewellery made to be lived in.
            </p>
          </div>
          <div className="about-mission__image">
            <img
              src={craftImg}
              onError={(e) => { e.currentTarget.src = '/products/6/2.jpeg'; }}
              alt="Emerald Statement Herringbone Necklace — our craft"
              className="about-mission__img"
            />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section section--beige about-values">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">What We Stand For</span>
            <h2 className="about-values__title">Our Values</h2>
          </div>
          <div className="about-values__grid">
            {VALUES.map((v) => (
              <div key={v.title} className="about-value-card">
                <h3 className="about-value-card__title">{v.title}</h3>
                <p className="about-value-card__desc">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section about-cta">
        <div className="container about-cta__inner">
          <h2 className="about-cta__title">
            Find a piece that&apos;s beautifully yours
          </h2>
          <p className="about-cta__desc">
            Browse our collection of thoughtfully crafted jewellery.
          </p>
          <Link to="/shop" className="btn btn-primary btn-lg">
            Explore the Collection
          </Link>
        </div>
      </section>

    </div>
  );
}
