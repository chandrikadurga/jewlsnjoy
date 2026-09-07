import FAQSection from '../../components/FAQ/FAQSection';

export default function FAQPage() {
  return (
    <div className="faq-page" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <FAQSection
        title="Frequently Asked Questions"
        subtitle="Find quick answers about delivery, returns, product quality, and customer support."
      />
    </div>
  );
}
