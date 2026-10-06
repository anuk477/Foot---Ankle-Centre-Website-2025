<?php
declare(strict_types=1);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');
require __DIR__ . '/assistant-lib.php';

function fac_reply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

try {
    $config = fac_config();
    $enabled = $config['api_key'] !== '' && function_exists('curl_init');
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if (!in_array($method, ['GET', 'POST'], true)) { header('Allow: GET, POST'); fac_reply(405, ['ok' => false]); }
    // Same-origin requests only. No wildcard CORS; no trust in forwarded IP headers.
    $expectedOrigin = $config['origin'] ?? 'https://www.footandanklecentre.co.uk';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && $origin !== $expectedOrigin) fac_reply(403, ['ok' => false]);
    if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') fac_reply(403, ['ok' => false]);
    if (!$enabled) fac_reply($method === 'GET' ? 200 : 503, ['ok' => $method === 'GET', 'enabled' => false]);
    session_name('fac_assistant');
    session_start(['use_strict_mode' => true, 'cookie_httponly' => true, 'cookie_samesite' => 'Strict',
        'cookie_secure' => strpos($expectedOrigin, 'https://') === 0, 'cookie_path' => '/api/']);
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(24));
    $csrf = $_SESSION['csrf']; session_write_close();
    if ($method === 'GET') fac_reply(200, ['ok' => true, 'enabled' => true, 'csrf' => $csrf]);
    if (!hash_equals($csrf, $_SERVER['HTTP_X_FAC_CSRF'] ?? '')) fac_reply(403, ['ok' => false]);
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) fac_reply(415, ['ok' => false]);
    $raw = file_get_contents('php://input', false, null, 0, 40001);
    if (strlen($raw) > 40000) fac_reply(413, ['ok' => false]);
    $data = json_decode($raw, true);
    if (!is_array($data)) fac_reply(400, ['ok' => false]);
    try { $messages = fac_validate_input($data); }
    catch (InvalidArgumentException $error) { fac_reply(400, ['ok' => false]); }
    if (!fac_take_quota($config, $_SERVER['REMOTE_ADDR'] ?? 'unknown')) {
        header('Retry-After: 600'); fac_reply(429, ['ok' => false]);
    }
    $knowledge = fac_knowledge();
    $curl = curl_init('https://api.openai.com/v1/responses');
    curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $config['api_key'], 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(fac_payload($config, $knowledge, $messages), JSON_THROW_ON_ERROR)
    ]);
    $rawResponse = curl_exec($curl); $httpStatus = curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
    if ($rawResponse === false || $httpStatus !== 200) fac_reply(503, ['ok' => false]);
    $response = json_decode($rawResponse, true, 512, JSON_THROW_ON_ERROR);
    fac_reply(200, fac_parse_response($response, $knowledge));
} catch (Throwable $error) {
    // Do not log conversations, API responses or secrets.
    fac_reply(503, ['ok' => false]);
}
