' ==============================================================================
' Студия СЛАУ и Дифференциальных Уравнений (Бесшумный запуск без черного окна)
' ==============================================================================

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = currentDir
WshShell.Run "cmd /c start.bat", 0, False
