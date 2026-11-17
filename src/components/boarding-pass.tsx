import { MapPin, Plane, Sparkles } from "lucide-react";
import type { Locale } from "@/lib/home-store";

const labels = {
  zh: {
    pass: "登机牌", student: "留学旅程", departure: "从家出发",
    home: "HOME", arrival: "下一站", moscow: "MOSCOW", city: "城市",
  },
  ru: {
    pass: "ПОСАДОЧНЫЙ", student: "ПУТЬ СТУДЕНТА", departure: "ОТКУДА",
    home: "ДОМ", arrival: "КУДА", moscow: "МОСКВА", city: "ГОРОД",
  },
};

/** An illustrative travel motif, without real passenger or flight information. */
export function BoardingPass({ locale }: { locale: Locale }) {
  const copy = labels[locale];
  return (
    <div className="boarding-pass" aria-hidden="true">
      <div className="boarding-pass-paper">
        <div className="boarding-pass-header">
          <span className="boarding-pass-brand"><Plane />StudentPath</span>
          <span>{copy.pass}</span>
        </div>
        <div className="boarding-pass-stub-header">{copy.pass}</div>

        <div className="boarding-pass-main">
          <svg className="boarding-pass-map" viewBox="0 0 500 230" focusable="false">
            <path d="M39 63c-5-21 13-38 37-35 16-20 43-10 55 4 25-3 41 15 33 34-5 13-22 10-29 25-9 20-31 20-45 7-9-17-43-12-51-35Z" />
            <path d="M124 119c17-14 43-2 48 18 6 21-9 31-15 46-5 14-6 30-18 28-12-2-9-26-17-39-10-17-13-41 2-53Z" />
            <path d="M218 48c15-16 34-10 49-17 19-12 35 1 52 0 24-9 47 0 62 11 23-1 49 7 47 26-2 18-25 14-36 23-15 13-28 2-44 4-10 2-16 22-27 19-14-4-8-26-25-27-21 0-25 11-44 2-19-8-49-21-34-41Z" />
            <path d="M256 99c22-8 44 11 44 35 1 23-18 57-32 53-15-5-8-26-21-36-15-13-15-42 9-52Z" />
            <path d="M377 163c19-17 48-12 59 5 13 19 0 31-18 29-12-8-29 2-39-8-9-9-11-17-2-26Z" />
          </svg>
          <div className="boarding-pass-barcode">
            {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
          </div>
          <div className="boarding-pass-details">
            <div className="boarding-pass-route">
              <div><span>{copy.departure}</span><strong>{copy.home}</strong></div>
              <div className="boarding-pass-flightline"><i /><Plane /><i /></div>
              <div><span>{copy.arrival}</span><strong>{copy.moscow}</strong></div>
            </div>
            <div className="boarding-pass-journey"><Sparkles /><span>{copy.student}</span></div>
          </div>
        </div>

        <div className="boarding-pass-stub">
          <div className="boarding-pass-city-icon"><MapPin /></div>
          <span>{copy.city}</span>
          <strong>{copy.moscow}</strong>
          <div className="boarding-pass-stub-barcode">
            {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
          </div>
        </div>
        <div className="boarding-pass-footer" />
        <div className="boarding-pass-stub-footer" />
      </div>
    </div>
  );
}
