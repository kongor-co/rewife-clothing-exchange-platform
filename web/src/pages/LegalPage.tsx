import { useParams } from "react-router-dom";

const content = {
  privacy: {
    title: "Privacy notice",
    body: "Development placeholder. rewife stores account, garment, exchange, and coin data needed to operate the pilot. Final owner-approved privacy content is required before inviting real users.",
  },
  terms: {
    title: "Terms of use",
    body: "Development placeholder. Members arrange handover, shipping, and any related payments independently. Final owner-approved terms are required before inviting real users.",
  },
  imprint: {
    title: "Imprint",
    body: "Development placeholder. The responsible operator and contact details must be supplied before the pilot opens to real users.",
  },
};

export function LegalPage() {
  const { page = "privacy" } = useParams();
  const selected = content[page as keyof typeof content] || content.privacy;
  return <div className="centered-page"><article className="panel legal-page"><p className="eyebrow">Pilot information</p><h1>{selected.title}</h1><p>{selected.body}</p></article></div>;
}
