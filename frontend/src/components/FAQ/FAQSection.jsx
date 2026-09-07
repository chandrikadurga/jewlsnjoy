import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, HelpCircle } from 'lucide-react';
import './FAQSection.css';

export const FAQ_DATA = [
  {
    id: 'track-order',
    question: 'How can I track my order?',
    answer: (
      <>
        Once your order is processed and shipped, you can track its status using the tracking link provided below. Delivery typically takes around 5 to 9 business days, depending on your location. Please visit our <Link to="/orders" className="faq-inline-link">Track Order page</Link> to track your order and stay updated on its progress. If you have any further questions or concerns regarding your order, feel free to reach out to our customer support team for assistance.
      </>
    ),
  },
  {
    id: 'refunds-exchanges',
    question: 'Do you offer refunds or exchanges?',
    answer: (
      <>
        Yes, we strive to ensure your satisfaction with every purchase from Jewels &apos;n&apos; Joys. If for any reason you&apos;re not completely satisfied with your order, we offer both refunds and exchanges within 7 days. Please refer to our <Link to="/return-policy" className="faq-inline-link">Return &amp; Refund Policy page</Link> for more detailed information on how to initiate a return or exchange. If you have any questions or need further assistance, please don&apos;t hesitate to contact our customer support team. We&apos;re here to help!
      </>
    ),
  },
  {
    id: 'contact-service',
    question: 'How can I contact your customer service?',
    answer: (
      <>
        You can reach our customer support team by calling us at <a href="tel:+919457650897" className="faq-inline-link">9457650897</a> during our business hours, which are Monday to Friday, 11:00 AM to 6:00 PM. Alternatively, you can email us at <a href="mailto:jewelsnjoys25@gmail.com" className="faq-inline-link">jewelsnjoys25@gmail.com</a>. We&apos;re always available to assist you with any inquiries or concerns you may have.
      </>
    ),
  },
  {
    id: 'sensitive-skin',
    question: "Are Jewels 'n' Joys jewellery pieces suitable for sensitive skin?",
    answer: (
      <>
        Yes, our jewellery pieces are crafted with high-quality materials that are hypoallergenic and suitable for sensitive skin. We understand the importance of comfort and safety, which is why we prioritize using materials that minimize the risk of irritation or allergic reactions. Additionally, our products undergo rigorous quality control measures to ensure they meet the highest standards. If you have specific concerns about allergies or sensitivities, please feel free to reach out to our customer support team for further assistance. We&apos;re here to help you find the perfect jewellery pieces for your needs!
      </>
    ),
  },
];

export default function FAQSection({ title = "FAQ", subtitle = "Got questions? We're here with clear answers." }) {
  // Store open question IDs (can toggle multiple open like in screenshot)
  const [openIds, setOpenIds] = useState(['track-order']);

  const toggleItem = (id) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section className="faq-section" aria-labelledby="faq-section-title">
      <div className="container">
        <div className="faq-section__header">
          <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>
            <HelpCircle size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
            Common Inquiries
          </span>
          <h2 className="faq-section__title" id="faq-section-title">
            {title}
          </h2>
          {subtitle && <p className="faq-section__desc">{subtitle}</p>}
        </div>

        <div className="faq-accordion-wrap">
          {FAQ_DATA.map((item) => {
            const isOpen = openIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}
              >
                <button
                  type="button"
                  className="faq-item__trigger"
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={isOpen}
                >
                  <span className="faq-item__question">{item.question}</span>
                  <span className="faq-item__icon-wrap" aria-hidden="true">
                    {isOpen ? <Minus size={18} strokeWidth={2} /> : <Plus size={18} strokeWidth={2} />}
                  </span>
                </button>

                {isOpen && (
                  <div className="faq-item__content">
                    <div className="faq-item__divider" aria-hidden="true" />
                    <p className="faq-item__answer">{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
