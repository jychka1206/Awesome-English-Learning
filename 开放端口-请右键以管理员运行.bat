@echo off
chcp 65001 >nul
echo 正在为「Sentence 3 Questions」开放端口 5176 和 3000...
netsh advfirewall firewall add rule name="Sentence3Q-Vite-5176" dir=in action=allow protocol=TCP localport=5176
netsh advfirewall firewall add rule name="Sentence3Q-API-3000" dir=in action=allow protocol=TCP localport=3000
echo.
echo 已添加规则。若提示“已存在”，说明规则之前加过，可忽略。
echo 请确保手机和电脑在同一 WiFi，然后在手机浏览器打开上面显示的地址。
pause
