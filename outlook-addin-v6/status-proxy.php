<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3MGPbu32VMJp27QRKoJVrTbhHVCxMYVNv2zqMHcz11RWYqfj1I2eQP8OQb7CGSb3Kmg/exec';

// The deployment build supplies this private configuration; never commit its value.
$statusSecret = getenv('OUTLOOK_STATUS_SECRET') ?: '';
if ($statusSecret === '' && is_file(__DIR__ . '/status-config.php')) {
    $statusSecret = require __DIR__ . '/status-config.php';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$enquiryId = is_string($data['enquiryId'] ?? null) ? trim($data['enquiryId']) : '';
$status = is_string($data['status'] ?? null) ? trim($data['status']) : '';

$allowedStatuses = [
    'Dealt With',
    'Email Sent',
    'Message Left',
    'No Reply',
    'To Be Followed Up',
    'Will Think About It'
];

if (!preg_match('/^ENQ-[A-Z0-9-]+$/i', $enquiryId)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid enquiry ID']);
    exit;
}

if (!in_array($status, $allowedStatuses, true)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid status']);
    exit;
}

if (!is_string($statusSecret) || $statusSecret === '' || !function_exists('curl_init')) {
    http_response_code(503);
    echo json_encode(['ok' => false, 'error' => 'The status service is not configured. Please contact the website administrator.']);
    exit;
}

$postFields = http_build_query([
    'action' => 'update-status',
    'secret' => $statusSecret,
    'enquiryId' => $enquiryId,
    'status' => $status
]);

$ch = curl_init(APPS_SCRIPT_URL);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $postFields,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/x-www-form-urlencoded'
    ],
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 30
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'Upstream request failed: ' . $error]);
    exit;
}

http_response_code($httpCode >= 200 && $httpCode < 300 ? 200 : 502);
echo $response;
