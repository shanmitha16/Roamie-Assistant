import QRCode from 'qrcode';

export class QRCodeService {
  async generateQR(data: string): Promise<string> {
    try {
      const qrDataUrl = await QRCode.toDataURL(data, {
        width: 300,
        margin: 2,
        color: {
          dark: '#003580',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });
      return qrDataUrl;
    } catch (error) {
      console.error('QR generation failed:', error);
      return '';
    }
  }
}
