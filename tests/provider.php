<?php
declare(strict_types=1);
namespace Illuminate\Support {
    class ServiceProvider {
        public array $assets = [];
        protected function publishes(array $assets, string $tag): void { $this->assets[$tag] = $assets; }
    }
}
namespace {
    function public_path(string $path): string { return '/public/' . $path; }
    require dirname(__DIR__) . '/src/McIconsServiceProvider.php';
    $provider = new \Themuhamed\Mcicons\McIconsServiceProvider();
    $provider->boot();
    $assets = $provider->assets['mcicons-assets'] ?? [];
    if (count($assets) !== 2 || !in_array('/public/vendor/mcicons/mcicons.css', $assets, true)) throw new \RuntimeException('Publishing contract changed');
    foreach ($assets as $source => $target) if (!file_exists($source)) throw new \RuntimeException('Missing publish source');
    echo "Laravel asset-publishing contract passed\n";
}
