<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Order $order,
        public string $message,
        public string $type, // e.g. 'approved', 'rejected', 'rescheduled', 'preparing', 'ready', 'completed'
        public ?array $extra = null
    ) {}

    public function broadcastOn(): array
    {
        // Only broadcast if the order belongs to a registered customer
        if ($this->order->customer_id) {
            return [new PrivateChannel('private-customer.' . $this->order->customer_id)];
        }
        return [];
    }

    public function broadcastAs(): string
    {
        return 'order.status.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'order_id'      => $this->order->id,
            'order_number'  => $this->order->order_number,
            'status'        => $this->order->status,
            'payment_status'=> $this->order->payment_status,
            'message'       => $this->message,
            'type'          => $this->type,
            'extra'         => $this->extra,
            'updated_at'    => now()->toISOString(),
        ];
    }
}