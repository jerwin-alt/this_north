<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $customerName,
        public string $otp,
        public int $expiryMinutes = 5,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'North Cakes — Email Verification Code',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.otp-verification',
            with: [
                'name'          => $this->customerName,
                'otp'           => $this->otp,
                'expiryMinutes' => $this->expiryMinutes,
            ],
        );
    }
}