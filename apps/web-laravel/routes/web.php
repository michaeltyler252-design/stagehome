<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PublicController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PublicController::class, 'home'])->name('home');

Route::get('/counties', [PublicController::class, 'counties'])->name('counties.index');
Route::get('/counties/{slug}', [PublicController::class, 'countyShow'])->name('counties.show');

Route::get('/universities', [PublicController::class, 'universities'])->name('universities.index');
Route::get('/universities/{slug}', [PublicController::class, 'universityShow'])->name('universities.show');

Route::get('/search', [PublicController::class, 'search'])->name('search');
Route::get('/properties/{slug}', [PublicController::class, 'propertyShow'])->name('properties.show');

Route::get('/blog', [PublicController::class, 'blogIndex'])->name('blog.index');
Route::get('/blog/{slug}', [PublicController::class, 'blogShow'])->name('blog.show');

Route::get('/sign-up', [AuthController::class, 'showRegister'])->name('register');
Route::post('/sign-up', [AuthController::class, 'register']);
Route::get('/sign-in', [AuthController::class, 'showLogin'])->name('login');
Route::post('/sign-in', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

Route::get('/dashboard', [DashboardController::class, 'tenant'])->name('dashboard');
