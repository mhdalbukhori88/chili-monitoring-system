Jalankan `alembic init alembic` (sudah sebagian di-scaffold di sini) lalu
`alembic revision --autogenerate -m "init"` dan `alembic upgrade head`
untuk mengelola migrasi skema PostgreSQL secara versioned di production,
alih-alih hanya mengandalkan `Base.metadata.create_all()` di main.py.
