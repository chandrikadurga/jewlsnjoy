import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './Accordion.css';

export function AccordionItem({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`accordion-item${open ? ' accordion-item--open' : ''}`}>
      <button
        className="accordion-item__trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        type="button"
      >
        <span className="accordion-item__title">{title}</span>
        <ChevronDown
          size={18}
          strokeWidth={1.5}
          className="accordion-item__icon"
        />
      </button>
      <div className="accordion-item__body" aria-hidden={!open}>
        <div className="accordion-item__content">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Accordion({ children }) {
  return <div className="accordion">{children}</div>;
}
