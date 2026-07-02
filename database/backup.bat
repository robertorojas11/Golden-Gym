@echo off
:: ---------------------------------------------------------------------
:: Script de Respaldo Automático - Golden Gym PostgreSQL
:: ---------------------------------------------------------------------

:: Configuración de Variables
SET CONTAINER_NAME=goldengym-postgres
SET DB_USER=gym_admin
SET DB_NAME=goldengym_access
SET BACKUP_DIR=%~dp0backups

:: Crear el directorio de respaldos si no existe
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Obtener Fecha y Hora de forma agnóstica a la región del sistema usando WMIC
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set datetime=%%I
if "%datetime%"=="" (
    :: Fallback en caso de que WMIC no esté disponible
    set YYYY=%date:~10,4%
    set MM=%date:~4,2%
    set DD=%date:~7,2%
    set HH=%time:~0,2%
    set Min=%time:~3,2%
) else (
    set YYYY=%datetime:~0,4%
    set MM=%datetime:~4,2%
    set DD=%datetime:~6,2%
    set HH=%datetime:~8,2%
    set Min=%datetime:~10,2%
)

:: Limpiar espacios en blanco en la hora
set HH=%HH: =0%

SET FILENAME=backup_%YYYY%-%MM%-%DD%_%HH%-%Min%.sql
SET FULLPATH=%BACKUP_DIR%\%FILENAME%

echo [%date% %time%] Generando respaldo en: %FULLPATH%...

:: Ejecutar pg_dump dentro del contenedor docker y canalizar la salida a Windows
docker exec -t %CONTAINER_NAME% pg_dump -U %DB_USER% -d %DB_NAME% > "%FULLPATH%"

if %ERRORLEVEL% EQU 0 (
    echo [%date% %time%] Respaldo completado con éxito.
    
    :: Opcional: Eliminar respaldos con más de 7 días de antigüedad para ahorrar espacio
    echo [%date% %time%] Limpiando respaldos mayores a 7 días...
    forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -7 /c "cmd /c del @path" 2>nul
) else (
    echo [%date% %time%] ERROR: No se pudo generar el respaldo. Verifique que Docker esté activo.
)
