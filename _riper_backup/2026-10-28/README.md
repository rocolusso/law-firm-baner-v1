# City banner

Адаптивный анимированный HTML-баннер. Next.js 16 (App Router, статический экспорт) и Remotion Player.
Видеофайла нет: анимация считается в браузере по кадрам и работает как обычная страница.

## Запуск

```bash
npm install
npm run dev        # http://localhost:3000, внизу переключатель форматов
npm run build      # статический HTML в папке out/
npm run lint && npm test
```

## Как встроить

Готовый баннер лежит в `out/embed/index.html`. Он занимает весь размер окна, поэтому формат задаёт iframe:

```html
<!-- desktop -->
<iframe
  src="https://your-domain/embed/"
  style="width:100%;aspect-ratio:21/9;border:0"
  title="Офис в центре города"
  loading="lazy"
></iframe>
<!-- mobile, вертикаль -->
<iframe
  src="https://your-domain/embed/"
  style="width:100%;aspect-ratio:9/16;border:0"
  title="Офис в центре города"
  loading="lazy"
></iframe>
```

Или подключите компонент `CityBanner` из `src/banner/ui/CityBanner.tsx` в своём Next.js-проекте и задайте родителю размер.

## Что менять

- `src/banner/banner.config.ts`: тексты, ссылка кнопки, цвета, длительность. Тексты сейчас заглушки.
- `src/banner/composition/scan.ts`: тайминг эпизодов (в кадрах, 30 fps).
- `public/banner/`: слои фото. `image-data.json` с огнями окон и сеткой полутонов построен по этому снимку, для другого фото его надо пересобрать.

## Как работает адаптив

`CityBanner` измеряет свой блок и передаёт в Player логический размер с тем же соотношением сторон.
`getLayout()` в `src/banner/geometry.ts` по этому соотношению выбирает раскладку текста (горизонтальную или вертикальную),
а `coverRect()` держит башню в кадре при любом формате. Анимация ставится на паузу вне экрана и в скрытой вкладке.
При `prefers-reduced-motion` показывается спокойный статичный кадр.

## Лицензия Remotion

Remotion бесплатен для личного использования и небольших команд, для компаний нужна платная лицензия.
Условия: https://www.remotion.dev/license
