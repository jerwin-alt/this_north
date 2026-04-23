<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up() {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->enum('role', ['admin', 'staff', 'customer'])->default('customer');
            $table->string('first_name', 100)->nullable();
            $table->string('last_name', 100)->nullable();
            $table->string('email', 150)->unique()->nullable();
            $table->string('password', 255)->nullable();
            $table->string('phone', 20)->nullable();
            $table->date('birth_date')->nullable();
            $table->text('address')->nullable();
            $table->enum('verification_type', ['senior_citizen', 'pwd'])->nullable();
            $table->enum('verification_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->string('id_number', 100)->nullable();
            $table->date('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_walk_in_customer')->default(false);
            $table->integer('signature_stamps')->default(0);
            $table->timestamps();
        });
    }
    public function down() : void
    { 
        Schema::dropIfExists('users');     
    }
};