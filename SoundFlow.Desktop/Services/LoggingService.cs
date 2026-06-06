using System;
using System.IO;

namespace SoundFlow.Desktop.Services;

public static class LoggingService
{
    private static readonly string LogFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "soundflow.log");
    private static readonly object LockObj = new();

    public static void Log(string component, string message)
    {
        lock (LockObj)
        {
            var logLine = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] [{component}] {message}";
            Console.WriteLine(logLine);
            try
            {
                File.AppendAllText(LogFilePath, logLine + Environment.NewLine);
            }
            catch
            {
                // Silently ignore log write errors
            }
        }
    }
}
