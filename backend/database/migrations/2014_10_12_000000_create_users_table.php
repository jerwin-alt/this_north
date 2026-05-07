<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // Roles
            $table->enum('role', ['admin', 'staff', 'customer'])->default('customer')->index();

            // Basic Info
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('email', 150)->unique();
            $table->string('password');

            // Contact
            $table->string('phone', 20)->nullable();
            $table->date('birth_date')->nullable();
            $table->text('address')->nullable();

            // Verification
            $table->enum('verification_type', ['senior_citizen', 'pwd'])->nullable();
            $table->enum('verification_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->string('id_number', 100)->nullable();
            $table->string('image')->nullable();

            // System Flags
            $table->boolean('is_active')->default(true)->index();
            $table->boolean('is_walk_in_customer')->default(false);

            // Loyalty
            $table->integer('signature_stamps')->default(0);

            // Auth
            $table->rememberToken();
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};