<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('lost_and_damages', function (Blueprint $table) {
            $table->id();

            // Polymorphic-style reference: item_id can point to either a
            // product (menu.id) or an ingredient (ingredients.id). We do NOT
            // use a real foreign key here because the target table changes
            // based on item_type — enforce integrity at the application layer.
            $table->unsignedBigInteger('item_id');
            $table->enum('item_type', ['product', 'ingredient']);

            // Quantity lost/damaged + unit of measure (e.g., "PCS", "G", "ML")
            $table->decimal('quantity', 10, 2);
            $table->string('unit', 20);

            // Estimated monetary value of the loss
            $table->decimal('estimated_cost', 10, 2);

            // Reason the item was written off
            $table->enum('damage_type', [
                'spoilage',
                'breakage',
                'expired',
                'misproduction',
            ]);

            // Free-form notes / explanation
            $table->text('description')->nullable();

            // Who reported it — required
            $table->foreignId('reported_by')
                  ->constrained('users')
                  ->onDelete('restrict');

            $table->timestamp('reported_at')->useCurrent();

            // Approval workflow — nullable until an admin reviews it
            $table->foreignId('approved_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');

            $table->timestamp('approved_at')->nullable();

            $table->enum('status', ['pending', 'approved', 'rejected'])
                  ->default('pending');

            // Helpful indexes for reporting & filtering
            $table->index('item_type');
            $table->index('status');
            $table->index('reported_at');
            $table->index(['item_type', 'item_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('lost_and_damages');
    }
};