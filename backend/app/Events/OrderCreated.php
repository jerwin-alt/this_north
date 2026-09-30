<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Order $order) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('admin.orders')];
    }

    public function broadcastAs(): string
    {
        return 'order.created';
    }

    public function broadcastWith(): array
    {
        // Eager-load everything the Admin Orders list + Order Details need
        // so the frontend never has to do a follow-up fetch.
        $this->order->load([
            'items.menu:id,name,image_url,base_price,menu_type',
            'items.customDesign.cakeSize',
            'items.customDesign.cakeFlavor',
            'customer:id,first_name,last_name,phone',
            'payments',
        ]);

        return ['order' => $this->order];
    }
}