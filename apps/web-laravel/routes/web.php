<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FavouriteController;
use App\Http\Controllers\ManagerController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SupportController;
use Illuminate\Support\Facades\Route;

// --- Public ---
Route::get('/', [PublicController::class, 'home'])->name('home');
Route::get('/counties', [PublicController::class, 'counties'])->name('counties.index');
Route::get('/counties/{slug}', [PublicController::class, 'countyShow'])->name('counties.show');
Route::get('/universities', [PublicController::class, 'universities'])->name('universities.index');
Route::get('/universities/{slug}', [PublicController::class, 'universityShow'])->name('universities.show');
Route::get('/search', [PublicController::class, 'search'])->name('search');
Route::get('/properties/{slug}', [PublicController::class, 'propertyShow'])->name('properties.show');
Route::get('/blog', [PublicController::class, 'blogIndex'])->name('blog.index');
Route::get('/blog/{slug}', [PublicController::class, 'blogShow'])->name('blog.show');

// --- Auth ---
Route::get('/sign-up', [AuthController::class, 'showRegister'])->name('register');
Route::post('/sign-up', [AuthController::class, 'register']);
Route::get('/sign-in', [AuthController::class, 'showLogin'])->name('login');
Route::post('/sign-in', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
Route::get('/verify-phone', [AuthController::class, 'showVerifyPhone'])->name('auth.verify-phone');
Route::post('/verify-phone/request', [AuthController::class, 'requestOtp'])->name('auth.otp.request');
Route::post('/verify-phone/verify', [AuthController::class, 'verifyOtp'])->name('auth.otp.verify');

// --- Tenant dashboard ---
Route::get('/dashboard', [DashboardController::class, 'tenant'])->name('dashboard');

// --- Favourites ---
Route::get('/favourites', [FavouriteController::class, 'index'])->name('favourites.index');
Route::post('/properties/{propertyId}/favourite', [FavouriteController::class, 'store'])->name('favourites.store');
Route::delete('/properties/{propertyId}/favourite', [FavouriteController::class, 'destroy'])->name('favourites.destroy');

// --- Bookings ---
Route::get('/bookings', [BookingController::class, 'index'])->name('bookings.index');
Route::post('/units/{unitId}/quotes', [BookingController::class, 'quote'])->name('bookings.quote');
Route::post('/quotes/{quoteId}/hold', [BookingController::class, 'hold'])->name('bookings.hold');
Route::post('/holds/{holdId}/confirm', [BookingController::class, 'confirm'])->name('bookings.confirm');

// --- Payments ---
Route::get('/bookings/{bookingId}/pay', [PaymentController::class, 'form'])->name('payments.form');
Route::post('/bookings/{bookingId}/pay', [PaymentController::class, 'initiate'])->name('payments.initiate');

// --- Reviews ---
Route::get('/bookings/{bookingId}/review', [ReviewController::class, 'form'])->name('reviews.form');
Route::post('/bookings/{bookingId}/review', [ReviewController::class, 'store'])->name('reviews.store');
Route::post('/reviews/{reviewId}/responses', [ReviewController::class, 'respond'])->name('reviews.respond');

// --- Support ---
Route::get('/support', [SupportController::class, 'index'])->name('support.index');
Route::post('/support', [SupportController::class, 'store'])->name('support.store');

// --- Manager ---
Route::get('/manager/organisations', [ManagerController::class, 'organisations'])->name('manager.organisations');
Route::post('/manager/organisations', [ManagerController::class, 'createOrganisation'])->name('manager.organisations.store');
Route::get('/manager/organisations/{organisationId}/dashboard', [ManagerController::class, 'dashboard'])->name('manager.dashboard');
Route::get('/manager/organisations/{organisationId}/properties/create', [ManagerController::class, 'createPropertyForm'])->name('manager.properties.create');
Route::post('/manager/organisations/{organisationId}/properties', [ManagerController::class, 'createProperty'])->name('manager.properties.store');
Route::get('/manager/properties/{propertyId}', [ManagerController::class, 'propertyShow'])->name('manager.properties.show');
Route::post('/manager/properties/{propertyId}/submit-for-verification', [ManagerController::class, 'submitForVerification'])->name('manager.properties.submit');
Route::post('/manager/properties/{propertyId}/units', [ManagerController::class, 'addUnit'])->name('manager.units.store');

// --- Admin ---
Route::get('/admin/dashboard', [AdminController::class, 'dashboard'])->name('admin.dashboard');
Route::get('/admin/verification', [AdminController::class, 'verificationQueue'])->name('admin.verification');
Route::post('/admin/verification/properties/{propertyId}/approve', [AdminController::class, 'approveProperty'])->name('admin.properties.approve');
Route::post('/admin/verification/properties/{propertyId}/publish', [AdminController::class, 'publishProperty'])->name('admin.properties.publish');
Route::post('/admin/verification/properties/{propertyId}/reject', [AdminController::class, 'rejectProperty'])->name('admin.properties.reject');
Route::post('/admin/verification/universities/{universityId}/verify', [AdminController::class, 'verifyUniversity'])->name('admin.universities.verify');
Route::post('/admin/verification/universities/{universityId}/reject', [AdminController::class, 'rejectUniversity'])->name('admin.universities.reject');
