<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('discounts', function (Blueprint $table) {
            $table->id();
            // Versioning fields (optional but useful for future audit)
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->integer('version')->default(1);

            $table->string('discount_name', 100);
            // Editable type – plain string, not enum
            $table->string('discount_type', 50)->default('percentage');
            $table->decimal('discount_value', 10, 2);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('requires_verification')->default(false);

            $table->timestamps();

            // Foreign key constraint for versioning
            $table->foreign('parent_id')->references('id')->on('discounts')->onDelete('set null');
            $table->index('is_active');
        });
    }

    public function down()
    {
        Schema::dropIfExists('discounts');
    }
};