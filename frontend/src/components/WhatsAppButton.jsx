import React from 'react';
import './WhatsAppButton.css';

const WhatsAppButton = () => {
  const phoneNumber = '917251070150';
  const message = "Hello Jewels 'n' Joys! I would like to know more about your jewellery collection.";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-floating-btn"
      aria-label="Chat with Jewels 'n' Joys on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      <svg
        viewBox="0 0 32 32"
        width="30"
        height="30"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M16 3C9.37 3 4 8.2 4 14.62c0 2.53.84 4.87 2.27 6.77L4.8 27l5.86-1.52A12.2 12.2 0 0 0 16 26.25c6.63 0 12-5.2 12-11.63S22.63 3 16 3Zm0 20.9c-1.75 0-3.46-.48-4.94-1.38l-.36-.21-3.48.9.93-3.3-.23-.34a9.16 9.16 0 0 1-1.6-5.15c0-5.14 4.34-9.32 9.68-9.32s9.68 4.18 9.68 9.32-4.34 9.48-9.68 9.48Zm5.31-6.98c-.29-.14-1.72-.82-1.99-.91-.27-.1-.46-.14-.66.14-.19.28-.75.91-.92 1.1-.17.19-.34.21-.63.07-.29-.14-1.22-.43-2.32-1.39-.86-.73-1.44-1.64-1.61-1.92-.17-.28-.02-.43.13-.57.13-.13.29-.33.44-.5.14-.17.19-.28.29-.47.1-.19.05-.35-.02-.5-.08-.14-.66-1.54-.9-2.11-.24-.57-.49-.49-.66-.5h-.56c-.19 0-.51.07-.78.35-.27.28-1.02.96-1.02 2.35 0 1.39 1.05 2.73 1.2 2.92.15.19 2.07 3.05 5.01 4.28.7.29 1.25.46 1.67.59.7.21 1.34.18 1.84.11.56-.08 1.72-.68 1.96-1.34.24-.66.24-1.23.17-1.34-.07-.12-.26-.19-.55-.33Z"
        />
      </svg>
    </a>
  );
};

export default WhatsAppButton;
