# MVP Scope v1

## Цель
Запустить рабочий control-loop продукт для тренера и ученика:
назначение -> выполнение -> отчет -> оценка сигналов -> действие тренера.

## In Scope
- Trainer auth, student auth по invite.
- Group + invite link.
- Exercise library (curated).
- Program creation and assignment.
- Training report (status + фактические данные по упражнениям).
- Wellbeing + текстовый комментарий.
- Фото-вложения к отчету.
- Trigger engine v1.
- Attention queue тренера.

## Out of Scope
- Питание, платежи, чат.
- AI-генерация программ.
- Видео pipeline.
- Мульти-тренер модель.
- Сложная BI-аналитика.

## Definition Of Success
- Полный e2e цикл от invite до закрытия trigger выполняется без ручных операций в БД.
