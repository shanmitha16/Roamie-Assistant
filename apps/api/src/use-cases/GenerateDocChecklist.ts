import { DocChecklistItem } from '../domain/entities';
import docChecklistsData from '../data/docChecklists.json';

export class GenerateDocChecklist {
  async execute(params: {
    passportCountry: string;
    destination: string;
    lang: string;
  }): Promise<DocChecklistItem[]> {
    const data = docChecklistsData as any;
    const countryData = data[params.passportCountry] || data['default'];
    const destData = countryData?.[params.destination] || countryData?.['default'] || data['default']['default'];

    const items: DocChecklistItem[] = [];

    // Visa
    items.push({
      category: 'documents',
      item: 'Visa Requirement',
      details: destData.visa || 'Check visa requirements for your nationality',
      urgent: true,
    });

    // Documents list
    (destData.documents || []).forEach((doc: string) => {
      items.push({
        category: 'documents',
        item: doc,
        details: 'Required for entry',
        urgent: true,
      });
    });

    // Health
    items.push({
      category: 'health',
      item: 'Health Requirements',
      details: destData.health || 'No mandatory vaccinations',
      urgent: false,
    });

    // Money
    items.push({
      category: 'money',
      item: 'Currency & Payments',
      details: destData.money || 'Check local currency and payment methods',
      urgent: false,
    });

    // Safety
    items.push({
      category: 'safety',
      item: 'Emergency Numbers',
      details: destData.emergency || 'International emergency: 112',
      urgent: false,
    });

    // Add generic items
    items.push(
      { category: 'documents', item: 'Travel Insurance', details: 'Medical + trip cancellation coverage recommended', urgent: true },
      { category: 'health', item: 'Personal Medications', details: 'Bring sufficient supply + prescription copies', urgent: false },
      { category: 'money', item: 'Backup Payment Method', details: 'Secondary credit/debit card in case primary fails', urgent: false },
      { category: 'safety', item: 'Embassy Contact', details: 'Save your country\'s embassy contact for the destination', urgent: false },
    );

    return items;
  }
}
